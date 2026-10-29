// Подписка в подвале: проверка адреса в браузере, без отправки.
// Ошибка — статус alert у поля; верный адрес — форма сменяется сообщением.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function initFooter(root = document) {
  const form = root.querySelector('.footer__form');
  if (!form) return;
  const field = form.querySelector('.input');
  const control = form.querySelector('.input__control');
  const message = form.querySelector('.input__message');
  const done = root.querySelector('.footer__done');

  const setAlert = (on) => {
    field.classList.toggle('input--inverse-alert', on);
    field.classList.toggle('input--inverse-neutral', !on);
    message.hidden = !on;
    control.toggleAttribute('aria-invalid', on);
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!EMAIL.test(control.value.trim())) {
      setAlert(true);
      control.focus();
      return;
    }
    form.hidden = true;
    done.hidden = false;
  });
  control.addEventListener('input', () => setAlert(false));
}
