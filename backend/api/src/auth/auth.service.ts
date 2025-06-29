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
      await this.usersRepository.save(user);

      const { access_token, refresh_token } = await this.generateTokens(user);
      await this.updateRefreshToken(user.id, refresh_token);

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
    await this.usersRepository.update(userId, { refreshToken: null });
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
    if (!user || !user.refreshToken || !user.isActive) {
      throw new UnauthorizedException('Access Denied');
    }

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );
    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Access Denied');
    }

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refresh_token);
    return tokens;
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersRepository.update(userId, {
      refreshToken: hashedRefreshToken,
    });
  }

  private async generateTokens(user: Users) {
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles.map((role) => role.name),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.jwtConfiguration.accessTokenSecret,
        expiresIn: `${this.jwtConfiguration.accessTokenTTL}s`,
      }),
      this.jwtService.signAsync(
        { sub: user.id },
        {
          secret: this.jwtConfiguration.refreshTokenSecret,
          expiresIn: `${this.jwtConfiguration.refreshTokenTTL}s`,
        },
      ),
    ]);

    return { access_token: accessToken, refresh_token: refreshToken };
  }
}
