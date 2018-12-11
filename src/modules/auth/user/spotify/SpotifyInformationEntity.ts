import * as _ from 'lodash';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('spotify-information')
export class SpotifyInformationEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  accessToken: string;

  @Column()
  refreshToken: string;

  @Column()
  expiresIn: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedDate: string;

  @Column()
  url: string;

  @Column()
  json: string;

  public toJSON() {
    return {
      id: this.id,
      updatedDate: this.updatedDate,
      url: this.url,
      json: !_.isNil(this.json) ? JSON.parse(this.json) : null
    };
  }
}
