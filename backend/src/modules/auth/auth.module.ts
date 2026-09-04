import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  APP_THROTTLE_LIMIT,
  APP_THROTTLE_TTL_MS,
  DEFAULT_ACCESS_TOKEN_TTL_SECONDS,
} from './auth.constants';

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
    // 'default' now serves two purposes: the app-wide ceiling once wired as
    // a global guard below (F6.3), and the baseline `/auth/login` further
    // tightens via its own `@Throttle` override (F4.3, auth.controller.ts).
    ThrottlerModule.forRoot([
      { name: 'default', ttl: APP_THROTTLE_TTL_MS, limit: APP_THROTTLE_LIMIT },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    // ThrottlerGuard must run before JwtAuthGuard, same reasoning as the
    // login route's own guard order (see auth.controller.ts): otherwise a
    // flood of requests with no/invalid token gets rejected by JwtAuthGuard's
    // 401 before ThrottlerGuard ever counts them, letting an attacker hammer
    // any protected route without ever tripping the limit. Both are declared
    // in this same array so their relative order is unambiguous.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  // InvitationsModule reuses AuthService.login to auto-log-in a newly
  // accepted invitee, the same session-issuance path a real login takes.
  exports: [AuthService],
})
export class AuthModule {}
