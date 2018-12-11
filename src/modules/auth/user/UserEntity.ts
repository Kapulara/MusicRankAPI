import { Required } from '@tsed/common';
import { Example } from '@tsed/swagger';
import * as crypto from 'crypto';
import * as _ from 'lodash';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn
} from 'typeorm';
import { CommunityEntity } from '../../community/CommunityEntity';
import { SongProposalEntity } from '../../community/song-proposal/SongProposalEntity';
import { SpotifyInformationEntity } from './spotify/SpotifyInformationEntity';

@Entity('user')
@Index([ 'name' ])
@Index([ 'email' ], { unique: true })
export class UserEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  @Example('John Doe')
  name: string;

  @Column()
  @Required()
  email: string;

  @Column({ nullable: true })
  token: string;

  @Column({ nullable: true })
  spotifyId: string;

  @Column({ default: false })
  isPlaylistAccount: boolean;

  @OneToOne(
    type => SpotifyInformationEntity)
  @JoinColumn()
  spotifyInformation: SpotifyInformationEntity;

  @OneToMany(
    type => CommunityEntity,
    community => community.admin
  )
  @JoinTable()
  adminCommunities: CommunityEntity[];

  @ManyToMany(
    type => CommunityEntity,
    community => community.participants
  )
  @JoinTable()
  communities: CommunityEntity[];

  @OneToMany(
    type => SongProposalEntity,
    songProposal => songProposal.createdBy
  )
  songProposals: SongProposalEntity[];

  @ManyToMany(
    type => SongProposalEntity,
    songProposal => songProposal.votes
  )
  votes: SongProposalEntity[];

  public static generateToken() {
    return crypto.randomBytes(12).toString('hex');
  }

  public toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      spotifyId: this.spotifyId,
      spotifyInformation: this.spotifyInformation,
      adminCommunities: this.adminCommunities,
      communities: this.communities
    };
  }

  public toParticipantJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      spotifyId: this.spotifyId,
      spotifyInformation: !_.isNil(this.spotifyInformation) ?
        this.spotifyInformation.toJSON() :
        undefined
    };
  }
}
