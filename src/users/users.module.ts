import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StringValue } from 'ms';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    // 👇 Importa PassportModule y JwtModule aquí también
    PassportModule.register({ defaultStrategy: 'jwt' }),
   JwtModule.registerAsync({
         imports: [ConfigModule],
         inject: [ConfigService],
         useFactory: (configService: ConfigService) => ({
           secret: configService.get<string>('JWT_SECRET'),
           signOptions: {
             expiresIn: configService.get<StringValue>('JWT_EXPIRES_IN') || '7d',
           },
         }),
       }),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}