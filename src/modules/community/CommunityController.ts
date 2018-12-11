import { Authenticated, BodyParams, Controller, Get, PathParams, Post, Req } from '@tsed/common';
import { Security } from '@tsed/swagger';
import { UserRequest } from '../auth/MyAuthenticatedMiddleware';
import { CommunityEntity } from './CommunityEntity';
import { CommunityService } from './CommunityService';

@Controller('/community')
export class CommunityController {

  constructor(
    private communityService: CommunityService
  ) {
  }

  @Post('/')
  @Authenticated()
  @Security('token')
  public async create(
    @BodyParams() community: CommunityEntity,
    @Req() request: UserRequest
  ) {
    return {
      err: false,
      data: await this.communityService.create(community, request.user)
    };
  }

  @Get('/')
  @Authenticated()
  @Security('token')
  public async getCommunities(
    @Req() request: UserRequest
  ) {
    return {
      err: false,
      data: request.user.communities.map((community) => community.toAllColumns(request.user))
    };
  }

  @Get('/:id')
  @Authenticated()
  @Security('token')
  public async getCommunity(
    @PathParams('id') id: string,
    @Req() request: UserRequest
  ) {
    const community = await this.communityService.getCommunity(id);

    return {
      err: false,
      data: community.toAllColumns(request.user)
    };
  }

}
