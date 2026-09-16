import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../../domain/models/user.model';
import { AuthRepository, LoginCredentials } from '../../domain/repositories/auth.repository';
import { UseCase } from '../use-case.contract';

/**
 * Use Case: Authenticate User.
 */
@Injectable({ providedIn: 'root' })
export class LoginUseCase implements UseCase<LoginCredentials, Observable<User>> {
  private readonly repository = inject(AuthRepository);

  execute(credentials: LoginCredentials): Observable<User> {
    return this.repository.login(credentials);
  }
}
