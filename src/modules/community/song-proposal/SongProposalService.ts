import { Service } from '@tsed/common';
import { TypeORMService } from '@tsed/typeorm';
import * as _ from 'lodash';
import { Forbidden } from 'ts-httpexceptions';
import { Connection } from 'typeorm';
import { UserEntity } from '../../auth/user/UserEntity';
import { CommunityEntity } from '../CommunityEntity';
import { CommunityService } from '../CommunityService';
import { SongCacheService } from './song-cache/SongCacheService';
import { SongProposalEntity } from './SongProposalEntity';

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

    const userWithProposals = await this.connection.manager.findOne(UserEntity, user.id, {
      relations: [
        'songProposals'
      ]
    });

    songProposal.community = community;
    songProposal.createdBy = userWithProposals;
    songProposal.votes = [];
    await this.connection.manager.save(songProposal);

    userWithProposals.songProposals.push(songProposal);
    await this.connection.manager.save(userWithProposals);
    community.songProposals.push(songProposal);
    await this.connection.manager.save(community);

    const proposal = this.findOne(songProposal.id, communityId);

    return proposal;
  }

  public async getAll(
    communityId: string,
    user: UserEntity,
    onlyDenied = false
  ) {
    const community = await this.communityService.getCommunity(communityId);
    let where = {
      community: community.id,
      isAccepted: false,
      isDenied: false
    };

    if ( onlyDenied ) {
      where = {
        community: community.id,
        isAccepted: false,
        isDenied: true
      };
    }

    let songProposals = await this.connection.manager.find(SongProposalEntity, {
      where,
      relations: [
        'community',
        'community.admin',
        'community.admin.spotifyInformation',
        'createdBy',
        'createdBy.spotifyInformation',
        'votes'
      ]
    });

    songProposals = await Promise.all(
      songProposals
        .map((songProposal) => songProposal.toJSON())
        .map(async (songProposal: any) => {
          songProposal.song = await this.songCacheService.getSong(songProposal.songId, user);

          return songProposal;
        })
    );

    songProposals = songProposals.sort((
      a,
      b
    ) => b.votes.length - a.votes.length);

    return songProposals;
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
    await this.communityService.updatePlaylist(community);

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
    await this.communityService.updatePlaylist(community);

    return songProposal;
  }

  public async restore(
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

    songProposal.isAccepted = false;
    songProposal.isDenied = false;
    await this.connection.manager.save(songProposal);
    await this.communityService.updatePlaylist(community);

    return songProposal;
  }

  public async vote(
    communityId: string,
    songId: string,
    user: UserEntity
  ) {
    await this.communityService.getCommunity(communityId);
    const songProposal = await this.findOne(songId, communityId);
    const userEntity = await this.connection.manager.findOne(UserEntity, {
      where: {
        id: user.id
      },
      relations: [ 'votes' ]
    });

    if (
      songProposal
        .votes
        .map((user) => user.id)
        .indexOf(userEntity.id) > -1
    ) {
      throw new Forbidden('Cannot vote twice on song.');
    }

    songProposal.votes.push(userEntity);
    await this.connection.manager.save(songProposal);

    userEntity.votes.push(songProposal);
    await this.connection.manager.save(userEntity);

    return songProposal;
  }

  public async deleteVote(
    communityId: string,
    songId: string,
    user: UserEntity
  ) {
    await this.communityService.getCommunity(communityId);
    const songProposal = await this.findOne(songId, communityId);
    const userEntity = await this.connection.manager.findOne(UserEntity, {
      where: {
        id: user.id
      },
      relations: [ 'votes' ]
    });

    const voteIndex = songProposal
      .votes
      .map((user) => user.id)
      .indexOf(userEntity.id);

    if ( voteIndex === -1 ) {
      throw new Forbidden('Cannot remove non-existing vote.');
    }

    const voteId = songProposal.votes[ voteIndex ].id;

    const proposalVote = _.find(songProposal.votes, { id: voteId });
    const proposalVoteIndex = songProposal.votes.indexOf(proposalVote);
    songProposal.votes.splice(proposalVoteIndex, 1);
    await this.connection.manager.save(songProposal);

    const userVote = _.find(userEntity.votes, { id: voteId });
    const userVoteIndex = userEntity.votes.indexOf(userVote);
    userEntity.votes.splice(userVoteIndex, 1);
    await this.connection.manager.save(userEntity);
  }
}
