import {
  Controller,
  Post,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DtoValidationGuard } from '../../common/guards/dto-validation.guard';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import {
  LOGIN_THROTTLE_LIMIT,
  LOGIN_THROTTLE_TTL_MS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE_PATH,
} from './auth.constants';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @UseGuards(DtoValidationGuard(LoginDto), LocalAuthGuard, ThrottlerGuard)
  @Throttle({
    default: { limit: LOGIN_THROTTLE_LIMIT, ttl: LOGIN_THROTTLE_TTL_MS },
  })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange email + password for a session' })
  async login(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const { accessToken, refreshToken } = await this.authService.login(user);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate the refresh token for a new access token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const rawToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
    if (!rawToken) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const { accessToken, refreshToken } =
      await this.authService.refresh(rawToken);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke the current refresh token' })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const rawToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
    if (rawToken) {
      await this.authService.logout(user.id, rawToken);
    }
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: REFRESH_TOKEN_COOKIE_PATH });
  }

  /**
   * `secure`/`sameSite` follow `NODE_ENV`: `best-practices.md §Security` calls
   * for `Secure; SameSite=None` for the real cross-domain Vercel↔API Gateway
   * deployment (F6.3+), but that combination requires HTTPS — local dev and
   * CI run over plain HTTP, where a `Secure` cookie would silently never be
   * stored by the browser.
   */
  private setRefreshCookie(res: Response, token: string): void {
    const isProd = this.configService.get('NODE_ENV') === 'production';
    const ttlDays = this.configService.get<number>(
      'JWT_REFRESH_EXPIRES_IN_DAYS',
      7,
    );
    res.cookie(REFRESH_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: REFRESH_TOKEN_COOKIE_PATH,
      maxAge: ttlDays * 24 * 60 * 60 * 1000,
    });
  }
}
