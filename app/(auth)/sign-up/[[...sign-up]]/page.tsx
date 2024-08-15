import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

const page = () => {
  return (
    <SignUp
      appearance={{
        baseTheme: dark,
      }}
    />
  );
};

export default page;
