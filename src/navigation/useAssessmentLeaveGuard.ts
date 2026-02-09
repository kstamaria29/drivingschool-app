import { useEffect, useRef } from "react";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { Alert } from "react-native";

type Input = {
  navigation: NavigationProp<ParamListBase>;
  enabled: boolean;
};

export function useAssessmentLeaveGuard({ navigation, enabled }: Input) {
  const allowLeaveRef = useRef(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      if (!enabled || allowLeaveRef.current) return;

      event.preventDefault();

      Alert.alert(
        "Leave assessment?",
        "You are currently assessing a student. Do you want to leave this assessment?",
        [
          { text: "Stay", style: "cancel" },
          {
            text: "Leave",
            style: "destructive",
            onPress: () => {
              allowLeaveRef.current = true;
              navigation.dispatch(event.data.action);
            },
          },
        ],
      );
    });

    return unsubscribe;
  }, [enabled, navigation]);

  function leaveWithoutPrompt(action: () => void) {
    allowLeaveRef.current = true;
    action();
  }

  return { leaveWithoutPrompt };
}

