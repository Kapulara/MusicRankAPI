import { Service } from '@tsed/common';
import { TypeORMService } from '@tsed/typeorm';
import * as _ from 'lodash';
import { Connection } from 'typeorm';
import { UserEntity } from '../../auth/user/UserEntity';
import { CommunityEntity } from '../CommunityEntity';
import { CommunityService } from '../CommunityService';
import { SongCacheService } from './song-cache/SongCacheService';
import { SongProposalEntity } from './SongProposalEntity';
import { BadRequest, Forbidden } from 'ts-httpexceptions';

@Service()
export class SongProposalService {

  public connection: Connection;

  constructor(
    private typeORMService: TypeORMService,
    private communityService: CommunityService,
    private songCacheService: SongCacheService
  ) {
  }

  $afterRoutesInit() {
    this.connection = this.typeORMService.get();
  }

  public async getProposal(
    songId: string,
    community: CommunityEntity
  ) {

  }

  public async propose(
    communityId: string,
    songProposal: SongProposalEntity,
    user: UserEntity
  ): Promise<SongProposalEntity> {
    const community = await this.communityService.getCommunity(communityId);
    const songIds = community.songProposals.map((songProposal) => songProposal.songId);

    if ( songIds.indexOf(songProposal.songId) > -1 ) {
      throw new Forbidden('This song is already proposed.');
    }

    songProposal.community = community;
    songProposal.createdBy = user;
    songProposal.votes = [];
    await this.connection.manager.save(songProposal);

    user.songProposals.push(songProposal);
    await this.connection.manager.save(user);
    community.songProposals.push(songProposal);
    await this.connection.manager.save(community);

    const proposal = this.findOne(songProposal.id, communityId);

    return proposal;
  }

  public async getAll(
    communityId: string,
    user: UserEntity
  ) {
    const community = await this.communityService.getCommunity(communityId);
    const songProposals = await this.connection.manager.find(SongProposalEntity, {
      where: {
        community: community.id,
        isAccepted: false,
        isDenied: false
      },
      relations: [
        'community',
        'community.admin',
        'community.admin.spotifyInformation',
        'createdBy',
        'createdBy.spotifyInformation',
        'votes'
      ]
    });

    return await Promise.all(
      songProposals
        .map((songProposal) => songProposal.toJSON())
        .map(async (songProposal: any) => {
          songProposal.song = await this.songCacheService.getSong(songProposal.songId, user);

          return songProposal;
        })
    );
  }

  public async findOne(
    songId,
    communityId
  ) {
    const community = await this.communityService.getCommunity(communityId);

    return await this.connection.manager.findOne(SongProposalEntity, {
      where: {
        community: community.id,
        songId
      },
      relations: [
        'community',
        'createdBy',
        'votes'
      ]
    });
  }

  public async deny(
    communityId: string,
    songId: string,
    user: UserEntity
  ) {
    const community = await this.communityService.getCommunity(communityId);
    const fullCommunity = community.toAllColumns(user);

    if ( !fullCommunity.isAdmin ) {
      throw new Forbidden('Not admin in community.');
    }

    const songProposal = await this.findOne(songId, communityId);

    if ( songProposal.isDenied ) {
      throw new Forbidden('Song already denied.');
    }

    songProposal.isDenied = true;
    songProposal.isAccepted = false;
    await this.connection.manager.save(songProposal);

    return songProposal;
  }

  public async accept(
    communityId: string,
    songId: string,
    user: UserEntity
  ) {
    const community = await this.communityService.getCommunity(communityId);
    const fullCommunity = community.toAllColumns(user);

    if ( !fullCommunity.isAdmin ) {
      throw new Forbidden('Not admin in community.');
    }

    const songProposal = await this.findOne(songId, communityId);

    if ( songProposal.isAccepted ) {
      throw new Forbidden('Song already accepted.');
    }

    songProposal.isAccepted = true;
    songProposal.isDenied = false;
    await this.connection.manager.save(songProposal);

    return songProposal;
  }

  public async vote(
    communityId: string,
    songId: string,
    user: UserEntity
  ) {
    await this.communityService.getCommunity(communityId);
    const songProposal = await this.findOne(songId, communityId);

    if (
      songProposal
        .votes
        .map((user) => user.id)
        .indexOf(user.id) > -1
    ) {
      throw new Forbidden('Cannot vote twice on song.');
    }

    songProposal.votes.push(user);
    await this.connection.manager.save(songProposal);

    user.votes.push(songProposal);
    await this.connection.manager.save(user);

    return songProposal;
  }

  public async deleteVote(
    communityId: string,
    songId: string,
    user: UserEntity
  ) {
    await this.communityService.getCommunity(communityId);
    const songProposal = await this.findOne(songId, communityId);

    const voteIndex = songProposal
      .votes
      .map((user) => user.id)
      .indexOf(user.id);

    if ( voteIndex === 1 ) {
      throw new Forbidden('Cannot remove non-existing vote.');
    }

    const voteId = songProposal.votes[ voteIndex ].id;

    const proposalVote = _.find(songProposal.votes, { id: voteId });
    const proposalVoteIndex = songProposal.votes.indexOf(proposalVote);
    songProposal.votes.splice(proposalVoteIndex, 1);
    await this.connection.manager.save(songProposal);

    const userVote = _.find(user.votes, { id: voteId });
    const userVoteIndex = user.votes.indexOf(userVote);
    user.votes.splice(userVoteIndex, 1);
    await this.connection.manager.save(user);
  }
}
