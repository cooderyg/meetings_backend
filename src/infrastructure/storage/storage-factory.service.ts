import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { AppConfig } from '../../shared/module/app-config/app-config';
import { IStorageService } from './interface/storage.interface';
import { S3Service } from './aws/s3.service';

@Injectable()
export class StorageFactoryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StorageFactoryService.name);
  private storageService: IStorageService;

  constructor(private readonly appConfig: AppConfig) {}

  async onModuleInit() {
    this.storageService = this.createStorageService();
    this.logger.log('Storage service initialized');
  }

  async onModuleDestroy() {
    this.logger.log('Storage service destroyed');
  }

  createStorageService(): IStorageService {
    const provider = this.appConfig.storage.provider;

    switch (provider) {
      case 'AWS':
        return new S3Service(this.appConfig);
      case 'GCP':
        throw new Error('GCP storage not implemented yet');
      default:
        throw new Error(`Unsupported storage provider: ${provider}`);
    }
  }

  getStorageService(): IStorageService {
    return this.storageService;
  }
}
