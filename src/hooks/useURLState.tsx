
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export function useURLState<T>(
  paramName: string, 
  defaultValue: T,
  serializer: (value: T) => string = String,
  deserializer: (value: string) => T = (value) => value as unknown as T
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get the initial value from the URL or use default
  const initialValue = searchParams.has(paramName)
    ? deserializer(searchParams.get(paramName)!)
    : defaultValue;
  
  const [state, setState] = useState<T>(initialValue);
  
  // Update the URL when state changes
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    const serializedValue = serializer(state);
    
    if (serializedValue === serializer(defaultValue)) {
      newParams.delete(paramName);
    } else {
      newParams.set(paramName, serializedValue);
    }
    
    setSearchParams(newParams);
  }, [state, paramName, searchParams, setSearchParams, defaultValue, serializer]);
  
  // Update state when URL changes
  useEffect(() => {
    if (searchParams.has(paramName)) {
      const value = deserializer(searchParams.get(paramName)!);
      setState(value);
    } else {
      setState(defaultValue);
    }
  }, [searchParams, paramName, defaultValue, deserializer]);
  
  return [state, setState] as const;
}

export function useURLParam(name: string): string | null {
  const [searchParams] = useSearchParams();
  return searchParams.get(name);
}

export function useRequiredURLParam(
  name: string, 
  redirectPath: string = '/',
  errorMessage: string = 'Required parameter is missing'
): string {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const value = searchParams.get(name);
  
  useEffect(() => {
    if (!value) {
      console.error(errorMessage);
      navigate(redirectPath, { replace: true });
    }
  }, [value, navigate, redirectPath, errorMessage]);
  
  return value || '';
}
