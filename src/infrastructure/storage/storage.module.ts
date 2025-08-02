import { Global, Module } from '@nestjs/common';
import { AppConfigModule } from '../../shared/module/app-config/app-config.module';
import {
  STORAGE_SERVICE,
  IStorageService,
} from './interface/storage.interface';
import { StorageFactoryService } from './storage-factory.service';

@Global()
@Module({
  imports: [AppConfigModule],
  providers: [
    StorageFactoryService,
    {
      provide: STORAGE_SERVICE,
      useFactory: (storageFactory: StorageFactoryService): IStorageService => {
        return storageFactory.createStorageService();
      },
      inject: [StorageFactoryService],
    },
  ],
  exports: [STORAGE_SERVICE, StorageFactoryService],
})
export class StorageModule {}
