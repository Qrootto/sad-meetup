// Единая точка подключения стилей — для лендинга и витрины.
// Блоки подхватываются сами: любой CSS в src/blocks/<блок>/.
import './tokens/primitives.css';
import './tokens/tokens.css';
import './base.css';

import.meta.glob('./components/*.css', { eager: true });
import.meta.glob('./blocks/*/*.css', { eager: true });
