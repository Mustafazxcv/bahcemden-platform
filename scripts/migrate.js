const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Windows için PostgreSQL yolları
const windowsPaths = [
    'C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe',
    'C:\\Program Files\\PostgreSQL\\14\\bin\\psql.exe',
    'C:\\Program Files\\PostgreSQL\\13\\bin\\psql.exe',
    'C:\\Program Files\\PostgreSQL\\12\\bin\\psql.exe',
    'C:\\Program Files (x86)\\PostgreSQL\\15\\bin\\psql.exe',
    'C:\\Program Files (x86)\\PostgreSQL\\14\\bin\\psql.exe',
    'C:\\Program Files (x86)\\PostgreSQL\\13\\bin\\psql.exe',
    'C:\\Program Files (x86)\\PostgreSQL\\12\\bin\\psql.exe'
];

function findPostgreSQLPath() {
    // Önce PATH'te psql var mı kontrol et
    try {
        execSync('psql --version', { stdio: 'pipe' });
        return 'psql';
    } catch (error) {
        // Windows yollarını kontrol et
        for (const psqlPath of windowsPaths) {
            if (fs.existsSync(psqlPath)) {
                return psqlPath;
            }
        }
        return null;
    }
}

try {
    console.log('Migration başlatılıyor...');
    
    const psqlPath = findPostgreSQLPath();
    
    if (!psqlPath) {
        console.error('PostgreSQL bulunamadı!');
        console.log('\nÇözüm önerileri:');
        console.log('1. PostgreSQL\'i yükleyin: https://www.postgresql.org/download/windows/');
        console.log('2. PostgreSQL\'i PATH\'e ekleyin');
        console.log('3. pgAdmin kullanarak manuel olarak migrate.sql dosyasını çalıştırın');
        console.log('4. Aşağıdaki yollardan birinde psql.exe olduğundan emin olun:');
        windowsPaths.forEach(p => console.log(`   - ${p}`));
        process.exit(1);
    }
    
    const migrateFile = path.join(__dirname, '..', 'migrate.sql');
    const command = `"${psqlPath}" -U postgres -d bahcemden -f "${migrateFile}"`;
    
    console.log(`Komut: ${command}`);
    
    execSync(command, { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
    });
    
    console.log('Migration başarıyla tamamlandı!');
} catch (error) {
    console.error('Migration hatası:', error.message);
    console.log('\nÇözüm önerileri:');
    console.log('1. PostgreSQL\'in yüklü olduğundan emin olun');
    console.log('2. "bahcemden" veritabanının oluşturulduğundan emin olun');
    console.log('3. PostgreSQL kullanıcı adı ve şifresini kontrol edin');
    console.log('4. pgAdmin kullanarak manuel olarak migrate.sql dosyasını çalıştırın');
    console.log('5. PostgreSQL\'i PATH\'e ekleyin');
    process.exit(1);
}
