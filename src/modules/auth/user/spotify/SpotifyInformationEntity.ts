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

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP'})
  updatedDate: string;

  @Column()
  url: string;

  @Column()
  json: string;

}
