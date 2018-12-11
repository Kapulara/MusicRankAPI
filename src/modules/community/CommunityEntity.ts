import { Example } from '@tsed/swagger';
import * as _ from 'lodash';
import { Column, Entity, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from '../auth/user/UserEntity';
import { SongProposalEntity } from './song-proposal/SongProposalEntity';

@Entity('community')
export class CommunityEntity {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  @Example('Drum & Bass')
  public name: string;

  @ManyToOne(
    type => UserEntity,
    user => user.adminCommunities
  )
  public admin: UserEntity;

  @OneToMany(
    type => SongProposalEntity,
    songProposal => songProposal.community
  )
  public songProposals: SongProposalEntity[];

  @ManyToMany(
    type => UserEntity,
    user => user.communities
  )
  public participants: UserEntity[];

  @Column()
  public playlistId: string;

  @Column()
  @Example(5)
  public threshold: number;

  public toAllColumns(user: UserEntity) {
    return {
      id: this.id,
      name: this.name,
      admin: this.admin,
      isAdmin: this.admin.id === user.id,
      songProposals: this.songProposals,
      participants: this.participants.map((participant) => participant.toParticipantJSON()),
      playlistId: this.playlistId,
      threshold: this.threshold
    };
  }

  public toJSON() {
    return {
      id: this.id,
      name: this.name,
      admin: !_.isNil(this.admin) ?
        this.admin.toParticipantJSON() :
        undefined,
      songProposals: this.songProposals,
      participants: !_.isNil(this.participants) ?
        this.participants.map((participant) => participant.toParticipantJSON()) :
        undefined,
      playlistId: this.playlistId,
      threshold: this.threshold
    };
  }
}
