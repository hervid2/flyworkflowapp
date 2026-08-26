import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DEFAULT_ACCESS_TOKEN_TTL_SECONDS } from './auth.constants';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          // `ConfigService.get` never coerces the raw env string to a
          // number — passing that string straight to jsonwebtoken makes it
          // run the value through the `ms` package instead of treating it as
          // seconds, so an explicit `Number(...)` conversion here is load-bearing.
          expiresIn: Number(
            configService.get<string>('JWT_ACCESS_EXPIRES_IN_SECONDS') ??
              DEFAULT_ACCESS_TOKEN_TTL_SECONDS,
          ),
        },
      }),
    }),
    // Named throttler kept out of `forRoot`'s default global guard — F4.3
    // attaches it explicitly only to `/auth/login`; F6.3 adds the app-wide one.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 20 }]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AuthModule {}
