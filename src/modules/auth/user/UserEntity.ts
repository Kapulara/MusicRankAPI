import { Required } from '@tsed/common';
import { Example } from '@tsed/swagger';
import * as bcrypt from 'bcrypt';
import { AfterLoad, BeforeInsert, BeforeUpdate, Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('user')
@Index([ 'firstName', 'lastName', 'lastName' ])
@Index([ 'email' ], { unique: true })
export class UserEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  @Example('John')
  firstName: string;

  @Column({ nullable: true })
  @Example('Doe')
  lastName: string;

  @Column()
  @Required()
  email: string;

  @Column()
  @Required()
  password: string;

  @Column({ nullable: true })
  token: string;

  /**
   * Temporary Password
   */
  private tempPassword: string;

  public verifyPassword(password): boolean {
    return bcrypt.compareSync(password, this.password);
  }

  @AfterLoad()
  private loadTempPassword(): void {
    this.tempPassword = this.password;
  }

  @BeforeInsert()
  private encryptPasswordInsert(): void {
    this.password = bcrypt.hashSync(this.password, 10);
  }

  @BeforeUpdate()
  private encryptPasswordUpdate(): void {
    if ( this.tempPassword !== this.password ) {
      this.password = bcrypt.hashSync(this.password, 10);
    }
  }

}
