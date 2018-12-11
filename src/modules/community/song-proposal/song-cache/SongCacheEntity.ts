import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('song-cache')
@Index([ 'songId' ], { unique: true })
export class SongCacheEntity {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public songId: string;

  @Column()
  public json: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public updatedDate: string;

  public toJSON() {
    return {
      id: this.id,
      songId: this.songId,
      json: JSON.parse(this.json),
      updatedDate: this.updatedDate
    };
  }
}
