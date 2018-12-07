import { Authenticated, BodyParams, Controller, Get, Post, Req } from '@tsed/common';
import { Security } from '@tsed/swagger';
import { UserEntity } from './UserEntity';
import { UserService } from './UserService';


@Controller('/user')
export class UserController {

  constructor(
    private UserService: UserService
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

  @Post('/authorize')
  public async authorize(
    @BodyParams('email') email: string,
    @BodyParams('password') password: string
  ) {
    return {
      err: false,
      data: await this.UserService.validate(email, password)
    };
  }

  @Get('/whoAmI')
  @Authenticated()
  @Security('token')
  public async whoAmI(
    @Req() req
  ) {
    const user: UserEntity = req.user;

    return {
      err: false,
      data: user
    };
  }
}
