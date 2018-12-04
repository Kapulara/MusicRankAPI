import { Service } from '@tsed/common';
import { TypeORMService } from '@tsed/typeorm';
import * as _ from 'lodash';
import { BadRequest, Unauthorized } from 'ts-httpexceptions';
import { Connection, Repository } from 'typeorm';
import * as uuidv4 from 'uuid/v4';
import { UserEntity } from './UserEntity';

@Service()
export class UserService {

  public static repository: Repository<UserEntity>;
  private connection: Connection;

  constructor(private typeORMService: TypeORMService) {
  }

  $afterRoutesInit() {
    this.connection = this.typeORMService.get();
    UserService.repository = this.connection.getRepository(UserEntity);
    // console.log('this.connection =>', this.connection);
  }

  public async create(
    userObject: UserEntity
  ) {
    if ( _.isNil(userObject[ 'email' ]) ) {
      throw new BadRequest('Email is required.');
    }
    if ( _.isNil(userObject[ 'password' ]) ) {
      throw new BadRequest('Password is required.');
    }

    if ( await this.exists(userObject[ 'email' ]) ) {
      throw new BadRequest('Email already exists.');
    }

    await this.connection.manager.save(userObject);

    return `User created with ${userObject.email}`;
  }

  public async exists(email: string) {
    return _.isNil(await this.connection.manager.findOne(UserEntity, { email })) === false;
  }

  public async validate(
    email,
    password
  ) {
    if ( await this.exists(email) ) {
      const user = await this.connection.manager.findOne(UserEntity, { email });

      if ( user.verifyPassword(password) ) {
        // Update token
        user.token = uuidv4();
        await this.connection.manager.save(user);

        return {
          id: user.id,
          email: user.email,
          token: user.token
        };
      }
    }

    throw new Unauthorized('Failed to authorize with given credentials.');
  }
}
