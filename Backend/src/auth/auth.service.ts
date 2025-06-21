// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from 'src/users/entities/users.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { ConfigType } from '@nestjs/config';
import jwtConfig from './config/jwt.config';

/**
 * Service handling authentication operations.
 * @class AuthService
 * @description Manages user authentication, including login and token generation.
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,

    private readonly jwtService: JwtService,

    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}

  /**
   * Authenticates a user and generates a JWT token.
   * @param loginDto - User login credentials
   * @returns Promise<{ access_token: string, refresh_token: string }> - JWT tokens for authenticated user
   * @throws UnauthorizedException - If credentials are invalid
   */
  async login(loginDto: LoginDto) {
    try {
      const user = await this.usersRepository.findOne({
        where: { email: loginDto.email },
        relations: ['roles'],
      });

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(
        loginDto.password,
        user.password,
      );
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('User is inactive');
      }

      // Update last login time
      user.lastLoginAt = new Date();

      const { access_token, refresh_token } = await this.generateTokens(user);

      user.refreshToken = await bcrypt.hash(refresh_token, 10);
      await this.usersRepository.save(user);

      const nameFromEmail = user.email.split('@')[0];

      return {
        access_token,
        refresh_token,
        message: `Welcome ${nameFromEmail}`,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Error during login');
    }
  }

  async logout(userId: string) {
    await this.usersRepository.update(userId, { refreshToken: undefined });
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Access Denied');
    }

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );
    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Access Denied');
    }

    const { access_token, refresh_token } = await this.generateTokens(user);

    user.refreshToken = await bcrypt.hash(refresh_token, 10);
    await this.usersRepository.save(user);

    return {
      access_token,
      refresh_token,
    };
  }

  private async generateTokens(user: Users) {
    const role = user.roles[0]?.name || 'USER';
    const payload = {
      sub: user.id,
      email: user.email,
      role,
    };

    const access_token = await this.jwtService.signAsync(payload, {
      audience: this.jwtConfiguration.audience,
      issuer: this.jwtConfiguration.issuer,
      secret: this.jwtConfiguration.secret,
      expiresIn: this.jwtConfiguration.accessTokenTTL,
    });

    const refresh_token = await this.jwtService.signAsync(
      { sub: user.id },
      {
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
        secret: this.jwtConfiguration.secret,
        expiresIn: this.jwtConfiguration.refreshTokenTTL,
      },
    );

    return { access_token, refresh_token };
  }
}
