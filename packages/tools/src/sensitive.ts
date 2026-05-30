export const SENSITIVE_FILE_PATTERNS = [
  /(^|\/|\\)api-key$/,
  /(^|\/|\\)\.env$/,
  /(^|\/|\\)\.env\.[^.]+$/,        // .env.production, .env.development
  /(^|\/|\\)\.env\.local$/,        // .env.local
  /(^|\/|\\)\.git\//,
  /(^|\/|\\)id_rsa$/,
  /(^|\/|\\)id_ed25519$/,
  /(^|\/|\\)\.ssh\//,
  /(^|\/|\\)known_hosts$/,
  /(^|\/|\\)[^.]+\.pem$/,          // 证书私钥
  /(^|\/|\\)[^.]+\.key$/,          // 私钥文件
  /(^|\/|\\)[^.]+\.pfx$/,          // PKCS#12 证书
  /(^|\/|\\)[^.]+\.p12$/,          // PKCS#12 证书
  /(^|\/|\\)\.npmrc$/,              // npm 认证 token
  /(^|\/|\\)credentials\.json$/,    // GCP/云服务凭证
  /(^|\/|\\)service-account\.json$/,
  /(^|\/|\\)\.aws\/credentials$/,   // AWS 凭证
  /(^|\/|\\)\.dockercfg$/,          // Docker 认证
  /(^|\/|\\)\.docker\/config\.json$/,
  /(^|\/|\\)\.netrc$/,              // 通用网络凭证
  /(^|\/|\\)\.htpasswd$/,
  /(^|\/|\\)token\.json$/,          // OAuth token
]

export function isSensitive(path: string): boolean {
  const normalized = path.replace(/\\/g, "/")
  for (const p of SENSITIVE_FILE_PATTERNS) {
    if (p.test(normalized)) return true
  }
  return false
}
