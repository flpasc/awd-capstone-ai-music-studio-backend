import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  private readonly saltRounds = process.env.BCRYPT_SALT_ROUNDS || 12;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // Create a new user
  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepo.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException(
        `User with the email: ${createUserDto.email} already exists`,
      );
    }

    // HACK: Do we need/want a helper for bcrypt?
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      this.saltRounds,
    );
    const newUser = this.userRepo.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return await this.userRepo.save(newUser);
  }

  async findAll(): Promise<User[]> {
    return this.userRepo.find();
  }

  // HACK: Should we have separate methods for getBy: Id and Email?
  // Find user by ID
  async findOneById(id: string): Promise<User> {
    const user = await this.userRepo.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with the id: ${id} not found`);
    }
    return user;
  }

  // Find user by email
  async findOneByEmail(email: string): Promise<User> {
    const user = await this.userRepo.findOneBy({ email });
    if (!user) {
      throw new NotFoundException(`User with the email: ${email} not found`);
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOneById(id);

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(
        updateUserDto.password,
        this.saltRounds,
      );
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepo.findOneBy({
        email: updateUserDto.email,
      });

      if (existingUser) {
        throw new ConflictException(`User with the email already exists`);
      }
    }
    await this.userRepo.update(id, updateUserDto);
    return await this.findOneById(id);
  }

  // HACK: Should we return something?
  async remove(id: string): Promise<void> {
    const user = await this.findOneById(id);
    await this.userRepo.remove(user);
  }
}
