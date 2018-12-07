'use strict';

import { Authenticated, BodyParams, Controller, Get, Middleware, PathParams, Post, Req, Res, Use } from '@tsed/common';
import { Security } from '@tsed/swagger';
import * as Express from 'express';
import { PathParameter } from 'swagger-schema-official';
import { UserRequest } from '../MyAuthenticatedMiddleware';
import { SpotifyLocalService } from './SpotifyLocalService';
import * as Passport from 'passport';

@Controller('/spotify')
export class SpotifyController {


  constructor(
    private spotifyLocalService: SpotifyLocalService,
  ) {
  }

  @Get('/')
  @Use(Passport.authenticate('spotify', {
    scope: [
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
    ],
    showDialog: true
  } as any))
  async login(
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
    request.user = await this.spotifyLocalService.checkRefresh(request.user, true);
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
    @BodyParams() params: any[] = []
  ) {
    request.user = await this.spotifyLocalService.checkRefresh(request.user);
    const { body: data } = await this.spotifyLocalService.apiFunction(func, params);

    return {
      err: false,
      data
    };
  }

}
