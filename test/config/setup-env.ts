import { config } from 'dotenv';
import { resolve } from 'path';

// .env.test 파일 로드
config({ path: resolve(__dirname, '../../.env.test') });
