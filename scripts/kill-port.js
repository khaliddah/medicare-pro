const net = require('net');
const { execSync } = require('child_process');

const PORT = 3000;

function killPort() {
  return new Promise((resolve) => {
    const tester = net.createServer();

    tester.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Port occupé → tuer le processus
        console.log(`⚠️  Port ${PORT} occupé, libération en cours...`);
        try {
          // Méthode 1: netstat
          const result = execSync(
            `netstat -ano | findstr :${PORT} | findstr LISTENING`,
            { shell: true, encoding: 'utf8' }
          );
          const pid = result.trim().split(/\s+/).pop();
          if (pid && pid !== '0') {
            execSync(`taskkill /PID ${pid} /F /T`, { shell: true });
            console.log(`✅ Processus ${pid} tué`);
          }
        } catch (e) {
          try {
            // Méthode 2: PowerShell fallback
            execSync(
              `powershell -Command "Get-NetTCPConnection -LocalPort ${PORT} | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }"`,
              { shell: true }
            );
            console.log(`✅ Port ${PORT} libéré via PowerShell`);
          } catch (e2) {
            console.log('⚠️  Impossible de libérer le port automatiquement');
          }
        }
        // Attendre que le port soit vraiment libre
        setTimeout(resolve, 1000);
      } else {
        resolve();
      }
      tester.close();
    });

    tester.once('listening', () => {
      tester.close();
      console.log(`✅ Port ${PORT} libre`);
      resolve();
    });

    tester.listen(PORT, '127.0.0.1');
  });
}

killPort().then(() => process.exit(0));
