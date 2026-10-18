export interface IMailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
  encryptionKey: string;
  frontendUrl: string;
  appName: string;
}
