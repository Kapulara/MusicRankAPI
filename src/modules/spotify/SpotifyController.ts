'use strict';

import {
  Authenticated,
  BodyParams,
  Controller,
  Get,
  Middleware,
  PathParams,
  Post,
  QueryParams,
  Req,
  Res,
  Use
} from '@tsed/common';
import { Security } from '@tsed/swagger';
import * as Express from 'express';
import { PathParameter } from 'swagger-schema-official';
import { UserRequest } from '../auth/MyAuthenticatedMiddleware';
import { SpotifyLocalService } from './SpotifyLocalService';
import * as Passport from 'passport';

@Controller('/spotify')
export class SpotifyController {

  public static scope = [
    'user-modify-playback-state',
    'user-read-currently-playing',
    'user-read-playback-state',
    'user-library-modify',
    'user-library-read',
    'streaming',
    'app-remote-control',
    'user-read-email',
    'user-read-private',
    'user-read-birthdate',
    'user-follow-read',
    'user-follow-modify',
    'playlist-read-private',
    'playlist-read-collaborative',
    'playlist-modify-public',
    'playlist-modify-private',
    'user-read-recently-played',
    'user-top-read'
  ];

  constructor(
    private spotifyLocalService: SpotifyLocalService
  ) {
  }

  @Get('/')
  @Use(Passport.authenticate('spotify', {
    scope: SpotifyController.scope,
    showDialog: false
  } as any))
  async login(
    @Req() request: Express.Request,
    @Res() response: Express.Response
  ) {
  }

  @Get('/dialog')
  @Use(Passport.authenticate('spotify', {
    scope: SpotifyController.scope,
    showDialog: true
  } as any))
  async loginDialog(
    @Req() request: Express.Request,
    @Res() response: Express.Response
  ) {
  }

  @Get('/callback')
  @Use(Passport.authenticate('spotify', {
    failureRedirect: process.env.FAILURE_URL || '/login'
  }))
  async callback(
    @Req() request: UserRequest,
    @Res() response: Express.Response
  ) {
    const { user } = await this.spotifyLocalService.checkRefresh(request.user, true);
    request.user = user;
    response.redirect((process.env.SUCCESS_URL || '/') + `?token=${encodeURIComponent(request.user.token)}`);
  }

  @Get('/api/allowedFunctions')
  @Authenticated()
  @Security('token')
  async getAllowedFunctions() {
    return {
      err: false,
      data: this.spotifyLocalService.allowedFunctions
    };
  }

  @Post('/api/:function')
  @Authenticated()
  @Security('token')
  async apiRequest(
    @Req() request: Express.Request,
    @Res() response: Express.Response,
    @PathParams('function') func: string,
    @QueryParams() queryParams: any = {},
    @BodyParams() params: any[] = []
  ) {
    const { user } = await this.spotifyLocalService.checkRefresh(request.user);
    request.user = user;
    const { body: data } = await this.spotifyLocalService.apiFunction(func, params);

    return {
      err: false,
      data
    };
  }

}
