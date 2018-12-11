import { Authenticated, BodyParams, Controller, Get, Post, Req } from '@tsed/common';
import { Security } from '@tsed/swagger';
import { SpotifyLocalService } from '../../spotify/SpotifyLocalService';
import { UserEntity } from './UserEntity';
import { UserService } from './UserService';


@Controller('/user')
export class UserController {

  constructor(
    private UserService: UserService,
    private spotifyLocalService: SpotifyLocalService
  ) {

  }

  @Post('/')
  public async createUser(
    @BodyParams() user: UserEntity
  ) {
    return {
      err: false,
      data: await this.UserService.create(user)
    };
  }

  @Get('/whoAmI')
  @Authenticated()
  @Security('token')
  public async whoAmI(
    @Req() req
  ) {
    const user = await this.spotifyLocalService.updateSpotifyInformation(req.user);

    return {
      err: false,
      data: user
    };
  }
}
