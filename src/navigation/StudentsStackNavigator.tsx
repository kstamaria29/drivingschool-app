import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { StudentDetailScreen } from "./screens/StudentDetailScreen";
import { StudentEditScreen } from "./screens/StudentEditScreen";
import { StudentsListScreen } from "./screens/StudentsListScreen";

export type StudentsStackParamList = {
  StudentsList: undefined;
  StudentDetail: { studentId: string };
  StudentCreate: undefined;
  StudentEdit: { studentId: string };
};

const Stack = createNativeStackNavigator<StudentsStackParamList>();

export function StudentsStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="StudentsList"
      screenOptions={{
        headerShadowVisible: false,
        headerTitle: "",
      }}
    >
      <Stack.Screen name="StudentsList" component={StudentsListScreen} />
      <Stack.Screen name="StudentDetail" component={StudentDetailScreen} />
      <Stack.Screen name="StudentCreate" component={StudentEditScreen} />
      <Stack.Screen name="StudentEdit" component={StudentEditScreen} />
    </Stack.Navigator>
  );
}

