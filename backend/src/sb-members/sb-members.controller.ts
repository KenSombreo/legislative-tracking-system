import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SbMembersService } from './sb-members.service';
import { CreateSbMemberDto, UpdateSbMemberDto } from './sb-member.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('sb-members')
@UseGuards(RolesGuard)
export class SbMembersController {
  constructor(private service: SbMembersService) {}

  @Get()
  findAll() {
    return this.service.list();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateSbMemberDto, @CurrentUser() user: any) {
    return this.service.create(dto, user._id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateSbMemberDto, @CurrentUser() user: any) {
    return this.service.update(id, dto, user._id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user._id);
  }
}
