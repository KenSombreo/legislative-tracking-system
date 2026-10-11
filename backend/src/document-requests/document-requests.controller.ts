import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { DocumentRequestsService } from './document-requests.service';
import { QueryDocumentRequestDto, UpdateDocumentRequestDto } from './document-request.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { CurrentUser } from '../common/decorators/current-user.decorator';

// Staff side of the public "request a copy" form. Requests hold personal details, so viewers cannot see them.
@Controller('document-requests')
@UseGuards(RolesGuard)
@Roles(UserRole.STAFF, UserRole.ADMIN)
export class DocumentRequestsController {
  constructor(private service: DocumentRequestsService) {}

  @Get()
  findAll(@Query() query: QueryDocumentRequestDto) {
    return this.service.findAll(query);
  }

  @Get('open-count')
  async openCount() {
    return { count: await this.service.countOpen() };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDocumentRequestDto, @CurrentUser() user: any) {
    return this.service.update(id, dto, user._id);
  }
}
