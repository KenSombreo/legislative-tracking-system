import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, ChangePasswordDto } from './dto/update-user.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from './schemas/user.schema';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditService } from '../audit-logs/audit.service';

@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(
    private usersService: UsersService,
    private auditService: AuditService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateUserDto, @CurrentUser() actor: any) {
    const user = await this.usersService.create(dto);
    await this.auditService.log(actor?._id, 'CREATE', 'User', user._id, `Created user ${user.username}`);
    return user;
  }

  @Patch('me/change-password')
  async changeOwnPassword(@Body() dto: ChangePasswordDto, @CurrentUser() actor: any) {
    await this.usersService.changePassword(actor._id, dto.currentPassword, dto.newPassword);
    await this.auditService.log(actor?._id, 'UPDATE', 'User', actor._id, 'Changed own password');
    return { success: true };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() actor: any) {
    const user = await this.usersService.update(id, dto);
    await this.auditService.log(actor?._id, 'UPDATE', 'User', user._id, `Updated user ${user.username}`);
    return user;
  }
}
