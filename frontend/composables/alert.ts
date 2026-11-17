type AlertCallback = () => void;

interface AlertProps {
  title: string | null;
  text: string | null;
  show: boolean;
  callback: AlertCallback | null;
}

export function useAlert() {
  const props = useState<AlertProps>("propsAlert", () => ({
    show: false,
    text: "¿Está seguro...?",
    title: "Alerta",
    callback: null,
  }));

  const setShow = (value: boolean) => {
    props.value.show = value;
  };

  const alert = (
    text?: string,
    callback?: AlertCallback,
    title?: string,
  ) => {
    props.value.show = true;
    props.value.title = title ?? "Alerta";
    props.value.text = text ?? "¿Está seguro...?";
    props.value.callback = callback ?? null;
  };

  return { alert, props, setShow };
}
