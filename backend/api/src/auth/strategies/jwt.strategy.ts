// src/auth/strategeies/jwt.strategy.ts
import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from 'src/users/entities/users.entity';
import { JwtPayload } from '../interfaces/jwt-payload.interface';  // Import JwtPayload interface
import jwtConfig from '../config/jwt.config';

/**
 * JWT Strategy for handling authentication.
 * @class JwtStrategy
 * @description Implements JWT-based authentication strategy using Passport.
 * Extracts JWT from request headers and validates the token.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
  ) {
    const secret = jwtConfiguration.accessTokenSecret;
    if (!secret) {
      throw new Error('JWT_ACCESS_TOKEN_SECRET is not defined in the environment variables');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Validates the JWT payload.
   * @param payload - The JWT payload containing user information
   * @returns The validated payload
   */
  async validate(payload: JwtPayload) {  // Use the JwtPayload type
    const { sub: id } = payload;
    
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User is inactive');
    }

    return user;
  }
}
