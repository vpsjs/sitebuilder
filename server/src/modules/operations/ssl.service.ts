import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';

const execFileAsync = promisify(execFile);

export interface CertResult {
  mode: 'selfsigned' | 'acme' | 'mock';
  certPath?: string;
  keyPath?: string;
  expiresAt: Date;
  fingerprint?: string;
}

/**
 * SSL 证书服务
 * ------------------------------------------------------------------
 * 生产环境：配置 SSL_ACME_ENABLED=true 并接入 ACME（Let's Encrypt）客户端，
 *           证书由真实 CA 签发，浏览器信任。
 * 本地开发：默认使用 openssl 生成自签证书（浏览器会提示"不受信任"，但 HTTPS 可用），
 *           用于打通"绑定域名 → 签发证书 → HTTPS 访问"的完整链路。
 * 无 openssl 时降级为 mock（仅标记状态，不生成真实证书）。
 */
@Injectable()
export class SslService {
  private readonly logger = new Logger(SslService.name);
  private readonly certDir = path.join(process.cwd(), 'storage', 'certs');

  constructor() {
    fs.mkdirSync(this.certDir, { recursive: true });
  }

  /** 为域名签发证书 */
  async issue(domain: string): Promise<CertResult> {
    const safeName = domain.replace(/[^a-z0-9.-]/gi, '_');

    // 生产：ACME（预留接入点；需要公网 80/443 与真实域名解析）
    if (process.env.SSL_ACME_ENABLED === 'true') {
      return this.issueAcme(domain, safeName);
    }

    // 本地：openssl 自签证书
    try {
      return await this.issueSelfSigned(domain, safeName);
    } catch (e) {
      this.logger.warn(`自签证书生成失败，降级为 mock: ${e}`);
      return this.issueMock();
    }
  }

  private async issueSelfSigned(domain: string, safeName: string): Promise<CertResult> {
    const certPath = path.join(this.certDir, `${safeName}.crt`);
    const keyPath = path.join(this.certDir, `${safeName}.key`);
    const days = 90;
    await execFileAsync('openssl', [
      'req', '-x509', '-nodes', '-newkey', 'rsa:2048',
      '-keyout', keyPath, '-out', certPath,
      '-days', String(days),
      '-subj', `/CN=${domain}`,
      '-addext', `subjectAltName=DNS:${domain},DNS:*.${domain}`,
    ]);
    const { stdout } = await execFileAsync('openssl', ['x509', '-in', certPath, '-noout', '-fingerprint', '-sha256']);
    const fingerprint = stdout.trim().split('=')[1] ?? '';
    return {
      mode: 'selfsigned', certPath, keyPath,
      expiresAt: new Date(Date.now() + days * 86400 * 1000),
      fingerprint,
    };
  }

  /** ACME 接入点：生产环境替换为真实 ACME 客户端（如 acme-client / greenlock） */
  private async issueAcme(domain: string, safeName: string): Promise<CertResult> {
    // 这里保留结构，真实接入时调用 ACME 客户端完成 DNS-01/HTTP-01 challenge。
    // 未配置 ACME 客户端时抛出，由调用方降级。
    const acmeDir = path.join(this.certDir, 'acme', safeName);
    const certPath = path.join(acmeDir, 'fullchain.pem');
    const keyPath = path.join(acmeDir, 'privkey.pem');
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      return { mode: 'acme', certPath, keyPath, expiresAt: new Date(Date.now() + 90 * 86400 * 1000) };
    }
    throw new Error('ACME 客户端未配置，请在 SslService.issueAcme 中接入');
  }

  private issueMock(): CertResult {
    return { mode: 'mock', expiresAt: new Date(Date.now() + 90 * 86400 * 1000) };
  }

  /** 读取证书 PEM（供 HTTPS 服务器或反向代理使用） */
  getCert(domain: string): { cert: string; key: string } | null {
    const safeName = domain.replace(/[^a-z0-9.-]/gi, '_');
    const certPath = path.join(this.certDir, `${safeName}.crt`);
    const keyPath = path.join(this.certDir, `${safeName}.key`);
    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) return null;
    return {
      cert: fs.readFileSync(certPath, 'utf8'),
      key: fs.readFileSync(keyPath, 'utf8'),
    };
  }

  /** 删除域名时清理证书 */
  removeCert(domain: string): void {
    const safeName = domain.replace(/[^a-z0-9.-]/gi, '_');
    for (const ext of ['.crt', '.key']) {
      const p = path.join(this.certDir, `${safeName}${ext}`);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  }
}
