import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Multer } from 'multer';

@Controller()
export class AppController {
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: Multer.File) {
    // Return the file path as a URL (adjust if you serve static files differently)
    return { url: `/uploads/${file.filename}` };
  }
}
