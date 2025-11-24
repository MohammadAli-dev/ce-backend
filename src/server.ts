import app from './app';
import { CONFIG } from './config';

export const startServer = () => {
    return app.listen(CONFIG.PORT, () => {
        console.log(`Server running on port ${CONFIG.PORT}`);
    });
};
