import { GlobalAcceptMimesMiddleware, ServerLoader, ServerSettings } from '@tsed/common';
import '@tsed/swagger';
import '@tsed/typeorm';

require('dotenv').config();

@ServerSettings({
  rootDir: __dirname,
  acceptMimes: [ 'application/json' ],
  httpPort: 9090,
  passport: {},
  mount: {
    '/v1': `${__dirname}/modules/**/**.js`
  },
  typeorm: [
    {
      name: 'default',
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: '',
      database: 'musicrank',
      synchronize: true,
      logging: false,
      entities: [
        `${__dirname}/**/**Entity{.ts,.js}`
      ],
      migrations: [
        `${__dirname}/migrations/**{.ts,.js}`
      ],
      subscribers: [
        `${__dirname}/**/**Subscriber{.ts,.js}`
      ]
    }
  ],
  swagger: {
    path: '/api-docs',
    spec: {
      info: {},
      securityDefinitions: {
        'token': {
          'type': 'apiKey',
          'name': 'X-User-Token',
          'in': 'header'
        }
      }
    }
  },
  debug: false
})
export class Server extends ServerLoader {

  constructor() {
    super();
  }
  
  /**
   * This method let you configure the middleware required by your application to works.
   * @returns {Server}
   */
  $onMountingMiddlewares(): void | Promise<any> {

    const cookieParser = require('cookie-parser'),
      bodyParser = require('body-parser'),
      compress = require('compression'),
      methodOverride = require('method-override'),
      session = require('express-session');


    this
      .use(GlobalAcceptMimesMiddleware)
      .use(cookieParser())
      .use(compress({}))
      .use(methodOverride())
      .use(bodyParser.json())
      .use(bodyParser.urlencoded({
        extended: true
      }))
      .use(session({
        secret: 'mysecretkey',
        resave: true,
        saveUninitialized: true,
        maxAge: 36000,
        cookie: {
          path: '/',
          httpOnly: true,
          secure: false,
          maxAge: null
        }
      }))
      .use((
        req,
        res,
        next
      ) => {
        res.set(
          'Access-Control-Allow-Origin',
          req.headers.origin
        );
        res.set(
          'Access-Control-Allow-Credentials',
          'true'
        );
        res.set(
          'Access-Control-Allow-Headers',
          'X-User-Token, Content-Type'
        );
        res.set(
          'Access-Control-Allow-Methods',
          'POST, GET, DELETE, PUT, OPTIONS'
        );
        next();
      });

    return null;
  }
}
