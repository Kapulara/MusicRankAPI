import { Authenticated, BodyParams, Controller, Delete, Get, PathParams, Post, Put, Req } from '@tsed/common';
import { Security } from '@tsed/swagger';
import { UserRequest } from '../../auth/MyAuthenticatedMiddleware';
import { SongProposalEntity } from './SongProposalEntity';
import { SongProposalService } from './SongProposalService';

@Controller('/community')
export class SongProposalController {

  constructor(
    private songProposalService: SongProposalService
  ) {
  }

  @Post('/:id/songs')
  @Authenticated()
  @Security('token')
  public async proposeSong(
    @PathParams('id') communityId: string,
    @BodyParams() songProposal: SongProposalEntity,
    @Req() request: UserRequest
  ) {
    return {
      err: false,
      data: await this.songProposalService.propose(communityId, songProposal, request.user)
    };
  }

  @Get('/:id/songs')
  @Authenticated()
  @Security('token')
  public async getProposedSongs(
    @PathParams('id') communityId: string,
    @Req() request: UserRequest
  ) {
    return {
      err: false,
      data: await this.songProposalService.getAll(communityId, request.user)
    };
  }

  @Get('/:id/songs/denied')
  @Authenticated()
  @Security('token')
  public async getDeniedProposedSongs(
    @PathParams('id') communityId: string,
    @Req() request: UserRequest
  ) {
    return {
      err: false,
      data: await this.songProposalService.getAll(communityId, request.user, true)
    };
  }

  @Get('/:id/songs/:songId')
  @Authenticated()
  @Security('token')
  public async getSong(
    @PathParams('id') communityId: string,
    @PathParams('songId') songId: string,
    @Req() request: UserRequest
  ) {
    return {
      err: false,
      data: await this.songProposalService.findOne(songId, communityId)
    };
  }

  @Post('/:id/songs/:songId/vote')
  @Authenticated()
  @Security('token')
  public async vote(
    @PathParams('id') communityId: string,
    @PathParams('songId') songId: string,
    @Req() request: UserRequest
  ) {
    return {
      err: false,
      data: await this.songProposalService.vote(communityId, songId, request.user)
    };
  }

  @Delete('/:id/songs/:songId/vote')
  @Authenticated()
  @Security('token')
  public async deleteVote(
    @PathParams('id') communityId: string,
    @PathParams('songId') songId: string,
    @Req() request: UserRequest
  ) {
    return {
      err: false,
      data: await this.songProposalService.deleteVote(communityId, songId, request.user)
    };
  }

  @Post('/:id/songs/:songId/deny')
  @Authenticated()
  @Security('token')
  public async denyProposedSong(
    @PathParams('id') communityId: string,
    @PathParams('songId') songId: string,
    @Req() request: UserRequest
  ) {
    return {
      err: false,
      data: await this.songProposalService.deny(communityId, songId, request.user)
    };
  }

  @Post('/:id/songs/:songId/allow')
  @Authenticated()
  @Security('token')
  public async acceptProposedSong(
    @PathParams('id') communityId: string,
    @PathParams('songId') songId: string,
    @Req() request: UserRequest
  ) {
    return {
      err: false,
      data: await this.songProposalService.accept(communityId, songId, request.user)
    };
  }

  @Post('/:id/songs/:songId/restore')
  @Authenticated()
  @Security('token')
  public async restoreProposedSong(
    @PathParams('id') communityId: string,
    @PathParams('songId') songId: string,
    @Req() request: UserRequest
  ) {
    return {
      err: false,
      data: await this.songProposalService.restore(communityId, songId, request.user)
    };
  }

}
