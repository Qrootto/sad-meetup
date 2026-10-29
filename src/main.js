import './styles.js';
import { initHoverSuppress } from './hover-suppress.js';
import { fixOrphans } from './fix-orphans.js';
import { initFooter } from './blocks/07-footer/footer.js';

fixOrphans();
initHoverSuppress();
initFooter();
