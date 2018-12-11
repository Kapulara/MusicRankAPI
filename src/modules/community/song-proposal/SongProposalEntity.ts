import { Example } from '@tsed/swagger';
import * as _ from 'lodash';
import { Column, Entity, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from '../../auth/user/UserEntity';
import { CommunityEntity } from '../CommunityEntity';

@Entity('song-proposal')
export class SongProposalEntity {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  @Example('0yo1RqzppX99LN9SDq6Myl')
  public songId: string;

  @Column({
    default: false
  })
  public isAccepted: boolean = false;

  @Column({
    default: false
  })
  public isDenied: boolean = false;

  @ManyToOne(
    type => CommunityEntity,
    community => community.songProposals
  )
  public community: CommunityEntity;

  @ManyToOne(
    type => UserEntity,
    user => user.songProposals
  )
  public createdBy: UserEntity;

  @ManyToMany(
    type => UserEntity,
    user => user.votes
  )
  @JoinTable()
  public votes: UserEntity[];

  public toJSON() {
    return {
      id: this.id,
      songId: this.songId,
      isAccepted: this.isAccepted,
      isDenied: this.isDenied,
      community: this.community,
      createdBy: !_.isNil(this.createdBy) ? this.createdBy.toParticipantJSON() : undefined,
      votes: this.votes
    };
  }
}
