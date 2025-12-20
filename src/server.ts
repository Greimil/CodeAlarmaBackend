import app from './app';
import { pollingService } from './api/monitoring/polling.service';

const PORT = 3000;

app.listen(PORT, () => {

  pollingService.start();
});

console.log(`Server is running on port ${PORT}`);