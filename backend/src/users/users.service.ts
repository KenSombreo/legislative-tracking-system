import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async findAll() {
    return this.userModel.find().sort({ createdAt: -1 }).exec();
  }

  async findById(id: string) {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByUsernameWithPassword(username: string) {
    return this.userModel
      .findOne({ username })
      .select('+passwordHash')
      .exec();
  }

  async findByUsernameOrEmail(username: string, email: string) {
    return this.userModel.findOne({ $or: [{ username }, { email }] }).exec();
  }

  async create(dto: CreateUserDto) {
    const existing = await this.findByUsernameOrEmail(dto.username, dto.email);
    if (existing) throw new ConflictException('Username or email already in use');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = new this.userModel({
      fullName: dto.fullName,
      username: dto.username,
      email: dto.email,
      passwordHash,
      role: dto.role,
      isActive: dto.isActive ?? true,
    });
    return user.save();
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findById(id);
    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.password) user.passwordHash = await bcrypt.hash(dto.password, 10);
    return user.save();
  }

  async updateLastLogin(id: string) {
    await this.userModel.updateOne({ _id: id }, { lastLoginAt: new Date() }).exec();
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const user = await this.userModel.findById(id).select('+passwordHash').exec();
    if (!user) throw new NotFoundException('User not found');
    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) throw new ConflictException('Current password is incorrect');
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    return user.save();
  }

  async countAll() {
    return this.userModel.countDocuments().exec();
  }
}
