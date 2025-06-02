import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Query,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/_auth/roles/roles.decorator';
import { Role } from 'src/_auth/roles/role.enum';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('register')
  @UseGuards(AuthGuard('jwt'))
  @Roles(Role.ADMIN)
  async register(@Body() body: { username: string; pass: string }) {
    return this.usersService.create(body.username, body.pass);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @Roles(Role.ADMIN)
  findAll(@Query('role') role?: string) {
    return this.usersService.findAll(role);
  }

  @Patch(':id/password')
  @UseGuards(AuthGuard('jwt'))
  @Roles(Role.ADMIN)
  resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body('pass') pass: string,
  ) {
    return this.usersService.resetPassword(id, pass);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}