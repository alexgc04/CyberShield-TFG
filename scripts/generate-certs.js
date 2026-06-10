const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

const certsDir = path.join(__dirname, '..', 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

const keyPath = path.join(certsDir, 'server.key');
const certPath = path.join(certsDir, 'cert.pem');

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  console.log('✅ Los certificados ya existen en ./certs/');
  process.exit(0);
}

console.log('Generando par de claves RSA (2048 bits)...');
const keys = forge.pki.rsa.generateKeyPair(2048);

console.log('Generando certificado autofirmado X.509...');
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

const attrs = [
  { name: 'commonName', value: 'localhost' },
  { name: 'countryName', value: 'ES' },
  { shortName: 'ST', value: 'Madrid' },
  { name: 'localityName', value: 'Madrid' },
  { name: 'organizationName', value: 'CyberShield Pro' },
  { shortName: 'OU', value: 'TFG' }
];

cert.setSubject(attrs);
cert.setIssuer(attrs);

// Extensiones (Subject Alternative Name para localhost)
cert.setExtensions([
  {
    name: 'basicConstraints',
    cA: true
  },
  {
    name: 'keyUsage',
    keyCertSign: true,
    digitalSignature: true,
    nonRepudiation: true,
    keyEncipherment: true,
    dataEncipherment: true
  },
  {
    name: 'extKeyUsage',
    serverAuth: true,
    clientAuth: true,
    codeSigning: true,
    emailProtection: true,
    timeStamping: true
  },
  {
    name: 'subjectAltName',
    altNames: [
      { type: 2, value: 'localhost' },
      { type: 7, ip: '127.0.0.1' },
      { type: 7, ip: '0.0.0.0' }
    ]
  }
]);

// Firmar
cert.sign(keys.privateKey, forge.md.sha256.create());

const pemCert = forge.pki.certificateToPem(cert);
const pemKey = forge.pki.privateKeyToPem(keys.privateKey);

fs.writeFileSync(certPath, pemCert);
fs.writeFileSync(keyPath, pemKey);

console.log('✅ Certificado autofirmado generado exitosamente.');
console.log('   - Ruta clave: ./certs/server.key');
console.log('   - Ruta cert:  ./certs/cert.pem');
