import { Required } from '@tsed/common';
import { Example } from '@tsed/swagger';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as _ from 'lodash';
import {
  AfterLoad,
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  Index, JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn
} from 'typeorm';
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
  password: string;

  @Column({ nullable: true })
  token: string;

  @Column({ nullable: true })
  spotifyId: string;

  @OneToOne(
    type => SpotifyInformationEntity)
  @JoinColumn()
  spotifyInformation: SpotifyInformationEntity;

  /**
   * Temporary Password
   */
  private tempPassword: string;

  public static generateToken() {
    return crypto.randomBytes(12).toString('hex');
  }

  public toJSON() {
    console.log(this);

    return {
      id: this.id,
      name: this.name,
      email: this.email,
      token: this.token,
      spotifyId: this.spotifyId,
      spotifyInformation: this.spotifyInformation
    };
  }

  public verifyPassword(password): boolean {
    if ( _.isNil(this.password) ) {
      return false;
    }

    return bcrypt.compareSync(password, this.password);
  }

  @AfterLoad()
  private loadTempPassword(): void {
    this.tempPassword = this.password;
  }

  @BeforeInsert()
  private encryptPasswordInsert(): void {
    if ( !_.isNil(this.password) ) {
      this.password = bcrypt.hashSync(this.password, 10);
    }
    if ( _.isNil(this.token) ) {
      this.token = UserEntity.generateToken();
    }
  }

  @BeforeUpdate()
  private encryptPasswordUpdate(): void {
    if ( !_.isNil(this.password) && this.tempPassword !== this.password ) {
      this.password = bcrypt.hashSync(this.password, 10);
    } else {
      this.password = null;
    }

    if ( _.isNil(this.token) ) {
      this.token = UserEntity.generateToken();
    }
  }

}
