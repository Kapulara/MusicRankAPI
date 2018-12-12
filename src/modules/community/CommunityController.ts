import { Authenticated, BodyParams, Controller, Delete, Get, PathParams, Post, Put, Req } from '@tsed/common';
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

  @Get('/')
  @Authenticated()
  @Security('token')
  public async getCommunities(
    @Req() request: UserRequest
  ) {
    return {
      err: false,
      data: await this.communityService.getAll(request.user)
    };
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

  @Put('/:id')
  @Authenticated()
  @Security('token')
  public async updateCommunity(
    @PathParams('id') id: string,
    @BodyParams() community: CommunityEntity,
    @Req() request: UserRequest
  ) {
    const communityToUpdate = await this.communityService.getCommunity(id);

    return {
      err: false,
      data: await this.communityService.update(communityToUpdate, community)
    };
  }

  @Delete('/:id')
  @Authenticated()
  @Security('token')
  public async deleteCommunity(
    @PathParams('id') id: string,
    @Req() request: UserRequest
  ) {
    return {
      err: false,
      data: await this.communityService.delete(id)
    };
  }

}
