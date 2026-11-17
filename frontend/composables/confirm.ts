interface ConfirmProps {
  title: string | null;
  text: string | null;
  show: boolean;
  done: any | null;
  cancel: any | null;
}
export function useConfirm() {
  var props = useState<ConfirmProps>("propsConfirm", () =>
    reactive({
      show: false,
      text: "¿Está seguro...?",
      title: "Alerta",
      done: null,
      cancel: null,
    })
  );
  const setShow = (value: boolean) => {
    props.value.show = value;
  };
  const confirm = (text?: string, done?: any, cancel?: any, title?: string) => {
    props.value.show = true;
    props.value.title = title || "Alerta";
    props.value.text = text || "¿Está seguro...?";
    if (typeof done === "function") {
      props.value.done = done;
    }
    if (typeof cancel === "function") {
      props.value.cancel = cancel;
    }
  };

  return { props, setShow, confirm };
}
