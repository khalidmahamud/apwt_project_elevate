import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsPhoneNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: 'User first name',
    example: 'John'
  })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    required: false
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({
    description: 'Date of birth in ISO format (YYYY-MM-DD)',
    example: '1990-01-01'
  })
  @IsNotEmpty()
  @IsDateString({ strict: true })
  dob: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com'
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User phone number (Bangladeshi format)',
    example: '+8801712345678',
    required: false
  })
  @IsOptional()
  @IsString()
  @IsPhoneNumber('BD', {
    message: 'Phone number must be a valid Bangladeshi phone number',
  })
  phone?: string;

  @ApiProperty({
    description: 'User password',
    example: 'password123'
  })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiProperty({
    description: 'URL to user profile image',
    example: 'https://example.com/profile.jpg',
    required: false
  })
  @IsOptional()
  @IsString()
  profileImage?: string;
}
