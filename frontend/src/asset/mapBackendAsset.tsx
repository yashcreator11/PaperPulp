const levelToType = (level: number): string => {
  switch (level) {
    case 1:
      return "Plant";
    case 2:
      return "Department";
    case 3:
      return "Line";
    case 4:
      return "Machine";
    case 5:
      return "SubMachine";
    default:
      return "Unknown";
  }
};

export default levelToType;
